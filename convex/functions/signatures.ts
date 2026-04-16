/**
 * Official signature management for consular agents.
 *
 * The signature PNG + metadata live inside `memberships.diplomaticProfile.officialSignature`
 * (see schemas/memberships.ts). It is applied to generated documents by the
 * signDocument action in `generatedDocuments.ts`.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { error, ErrorCode } from "../lib/errors";
import { assertCanSignDocuments } from "../lib/documentPermissions";

// ============================================================================
// QUERIES
// ============================================================================

/** Return the signature attached to the current user's membership in `orgId`. */
export const getMySignature = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const membership = await loadMembership(ctx, ctx.user._id, args.orgId, { strict: false });
		if (!membership) return null;
		const sig = membership.diplomaticProfile?.officialSignature;
		if (!sig?.imageStorageId) return null;
		const url = await ctx.storage.getUrl(sig.imageStorageId);
		return { ...sig, url };
	},
});

// ============================================================================
// MUTATIONS
// ============================================================================

/** Short-lived URL the browser POSTs the signature PNG to. */
export const generateSignatureUploadUrl = authMutation({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const membership = await loadMembership(ctx, ctx.user._id, args.orgId);
		await assertCanSignDocuments(ctx, ctx.user, membership);
		return await ctx.storage.generateUploadUrl();
	},
});

/**
 * Replace the signature on the current membership.
 *
 * Permission: `documents.sign`. Writes `uploadedAt`, `positionCodeAtUpload`
 * and `displayName` alongside the storageId so an auditor can trace who
 * signed with which position even after a reassignment.
 */
export const setMySignature = authMutation({
	args: {
		orgId: v.id("orgs"),
		imageStorageId: v.id("_storage"),
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const membership = await loadMembership(ctx, ctx.user._id, args.orgId);
		await assertCanSignDocuments(ctx, ctx.user, membership);

		const position = membership.positionId
			? await ctx.db.get(membership.positionId)
			: null;

		const displayName = [ctx.user.firstName, ctx.user.lastName]
			.filter(Boolean)
			.join(" ")
			.trim() || ctx.user.name;

		const existingProfile = membership.diplomaticProfile ?? {};
		const existingSignature = existingProfile.officialSignature ?? {};

		await ctx.db.patch(membership._id, {
			diplomaticProfile: {
				...existingProfile,
				officialSignature: {
					...existingSignature,
					imageStorageId: args.imageStorageId,
					title: args.title ?? existingSignature.title,
					uploadedAt: Date.now(),
					positionCodeAtUpload:
						(position as unknown as { code?: string } | null)?.code ??
						existingSignature.positionCodeAtUpload,
					displayName,
				},
			},
		});
		return membership._id;
	},
});

/** Remove the signature from the current membership. */
export const clearMySignature = authMutation({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const membership = await loadMembership(ctx, ctx.user._id, args.orgId);
		await assertCanSignDocuments(ctx, ctx.user, membership);

		const existingProfile = membership.diplomaticProfile ?? {};
		const existingSignature = existingProfile.officialSignature ?? {};
		const previous = existingSignature.imageStorageId;

		await ctx.db.patch(membership._id, {
			diplomaticProfile: {
				...existingProfile,
				officialSignature: {
					...existingSignature,
					imageStorageId: undefined,
				},
			},
		});
		if (previous) {
			await ctx.storage.delete(previous);
		}
		return membership._id;
	},
});

// ============================================================================
// Helpers
// ============================================================================

async function loadMembership(
	ctx: MutationCtx | QueryCtx,
	userId: Id<"users">,
	orgId: Id<"orgs">,
	opts?: { strict?: boolean },
): Promise<Doc<"memberships">>;
async function loadMembership(
	ctx: MutationCtx | QueryCtx,
	userId: Id<"users">,
	orgId: Id<"orgs">,
	opts: { strict: false },
): Promise<Doc<"memberships"> | null>;
async function loadMembership(
	ctx: MutationCtx | QueryCtx,
	userId: Id<"users">,
	orgId: Id<"orgs">,
	opts: { strict?: boolean } = {},
): Promise<Doc<"memberships"> | null> {
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user_org", (q) => q.eq("userId", userId).eq("orgId", orgId))
		.first();
	if (!membership && opts.strict !== false) {
		throw error(ErrorCode.FORBIDDEN, "Vous n'êtes pas membre de cette organisation");
	}
	return membership;
}
