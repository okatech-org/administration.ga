/**
 * Auto-generation trigger evaluator — decides which templates should be
 * produced automatically for a given request event.
 *
 * Called from:
 *  - `requests.updateStatus` after `assertCanTransition` (trigger
 *    `on_status_transition`).
 *  - `requests.createFromForm` + `requests.internalSubmit` (trigger
 *    `on_submission`).
 *
 * Returns a list of `{templateId, autoSign, autoPublish}` entries that the
 * caller schedules via `ctx.scheduler.runAfter(0, internal...)` so the auto
 * generation runs outside the mutation's critical path.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type AutoTrigger =
	| { kind: "submission" }
	| { kind: "status_transition"; from: string; to: string };

export interface ResolvedAutoTrigger {
	templateId: Id<"documentTemplates">;
	autoSign: boolean;
	autoPublish: boolean;
	/** Per-placeholder mapping forwarded to the generation action. Optional. */
	fieldMapping?: Record<
		string,
		{
			source: "user" | "profile" | "request" | "formData" | "org" | "system";
			path?: string;
		}
	>;
}

/**
 * Given a request and its triggering event, return the list of auto-generation
 * rules that match — deduplicated by templateId.
 */
export async function evaluateAutoTriggers(
	ctx: MutationCtx,
	request: Doc<"requests">,
	trigger: AutoTrigger,
): Promise<ResolvedAutoTrigger[]> {
	const orgService = await ctx.db.get(request.orgServiceId);
	if (!orgService) return [];
	const rules = orgService.autoGenerationRules;
	if (!rules || rules.length === 0) return [];

	const matches: ResolvedAutoTrigger[] = [];
	const seen = new Set<string>();

	for (const rule of rules) {
		if (!matchesTrigger(rule, trigger)) continue;
		const key = rule.templateId as unknown as string;
		if (seen.has(key)) continue;
		seen.add(key);
		matches.push({
			templateId: rule.templateId,
			autoSign: rule.autoSign,
			autoPublish: rule.autoPublish,
			fieldMapping: rule.fieldMapping,
		});
	}

	return matches;
}

function matchesTrigger(
	rule: NonNullable<Doc<"orgServices">["autoGenerationRules"]>[number],
	trigger: AutoTrigger,
): boolean {
	if (rule.trigger === "on_submission") return trigger.kind === "submission";
	if (rule.trigger === "on_status_transition") {
		if (trigger.kind !== "status_transition") return false;
		if (rule.toStatus && rule.toStatus !== trigger.to) return false;
		if (rule.fromStatus && rule.fromStatus !== trigger.from) return false;
		return true;
	}
	return false;
}
