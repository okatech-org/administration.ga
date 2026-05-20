/**
 * iastedDelegationHelpers — Helpers internes pour le tool vocal
 * `delegate_request` (Sprint 8 — F3).
 *
 * Responsabilité : étant donné un `userId` (résolu via find_contact_by_name)
 * et un `requestId`, trouver le `memberships._id` correspondant pour pouvoir
 * appeler la mutation existante `functions/requests.assign({ requestId, agentId })`
 * qui attend un memberId.
 *
 * Cas d'erreur (retour `null`) :
 *   - request inexistant
 *   - membership inexistant pour ce userId dans l'org du request
 *   - membership soft-deleted
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const resolveMembershipInternal = internalMutation({
	args: {
		userId: v.id("users"),
		requestId: v.id("requests"),
	},
	handler: async (ctx, { userId, requestId }) => {
		const request = await ctx.db.get(requestId);
		if (!request) return null;
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org_deletedAt", (q: any) =>
				q.eq("userId", userId).eq("orgId", request.orgId).eq("deletedAt", undefined),
			)
			.first();
		return membership?._id ?? null;
	},
});
